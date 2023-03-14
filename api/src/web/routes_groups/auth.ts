import { request } from "https";
import { createUser } from "../../core/controllers/users/set";
import {
  cancelSubscription,
  runUserChecks,
  verifyUser,
} from "../../core/controllers/users/update";
import { getUserFromToken } from "../../core/utils";
import { config, cookieConfigs } from "../../config";
import { UsersController } from "../../core/controllers/users";
import { StatusCode } from "../messages/message";
import { validateUID } from "../params/extracter";
import { limiter, registerLimiter } from "../limiters";
import { User } from "../../types/schema";
import { GENERAL_ERROR, SUCCESS } from "../../core/strings";
import { WebsitesController } from "../../core/controllers";
import { connect } from "../../database";
import { allowedNext } from "../../core/utils/get-user-data";
import type { FastifyInstance } from "fastify";

const clientID = process.env.GITHUB_CLIENT_ID;
const clientSecret = process.env.GITHUB_CLIENT_SECRET;

// Authenticate with github @param requestToken string
const onAuthGithub = (requestToken: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    // TODO: shape with ttsc
    const data = JSON.stringify({
      client_id: clientID,
      client_secret: clientSecret,
      code: requestToken,
    });

    const req = request(
      {
        method: "POST",
        hostname: "github.com",
        port: 443,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": data.length,
        },
        path: "/login/oauth/access_token",
      },
      (res) => {
        res.setEncoding("utf8");

        let resd = "";

        res.on("data", (chunk) => {
          resd += chunk;
        });

        res.on("end", () => {
          resolve(resd);
        });
      }
    );

    req.write(data);

    req.on("error", (err) => {
      reject(err);
    });

    req.end();
  });
};

// explicit valid props to send over the API for USER data
const cleanUserProps = ({
  alertEnabled,
  email,
  emailConfirmed,
  githubId,
  id,
  jwt,
  lastLoginDate,
  pageSpeedApiKey,
  role,
  scanInfo,
  stripeID,
  websiteLimit,
}: User) => {
  return {
    alertEnabled,
    email,
    emailConfirmed,
    githubId,
    id,
    jwt,
    lastLoginDate,
    pageSpeedApiKey,
    role,
    scanInfo,
    stripeID,
    websiteLimit,
  };
};

// set all authentication routes [ auth required for api ]
export const setAuthRoutes = (app: FastifyInstance) => {
  app.post("/api/register", registerLimiter, async (req, res) => {
    const allowed = await allowedNext(
      req?.headers?.authorization || req.cookies.jwt,
      req,
      res
    );

    if (allowed) {
      try {
        const auth = await createUser(req.body);

        res.setCookie("jwt", auth.jwt, cookieConfigs).send({
          data: cleanUserProps(auth),
          message: SUCCESS,
        });
      } catch (e) {
        res.status(StatusCode.BadRequest);
        res.send({
          data: null,
          message: e?.message,
        });
      }
    }
  });
  app.post("/api/login", limiter, async (req, res) => {
    const allowed = await allowedNext(
      req?.headers?.authorization || req.cookies.jwt,
      req,
      res
    );

    if (allowed) {
      try {
        const auth = await verifyUser(req.body);

        res.setCookie("jwt", auth.jwt, cookieConfigs).send({
          data: cleanUserProps(auth),
          message: SUCCESS,
        });
      } catch (e) {
        res.status(StatusCode.BadRequest);
        res.send({
          data: null,
          message: e?.message,
        });
      }
    }
  });

  app.post("/api/logout", (_req, res) => {
    res.setCookie("jwt", "", cookieConfigs);
    res.clearCookie("jwt");
    res.send();
  });

  // A NEW INSTANCE OF THE APP BASIC PING (RUNS ONCE ON APP START)
  app.post("/api/ping", (req, res) => {
    if (req.cookies.jwt || req.headers.authorization) {
      const id = getUserFromToken(req.cookies.jwt || req.headers.authorization)
        ?.payload?.keyid;

      if (validateUID(id)) {
        setImmediate(async () => {
          await runUserChecks({
            userId: id,
          });
        });
      }
    }

    res.status(200).send();
  });

  // delete all account adata
  app.delete("/api/user", async (req, res) => {
    let message = GENERAL_ERROR;
    if (req.cookies.jwt || req.headers.authorization) {
      const user = getUserFromToken(
        req.cookies.jwt || req.headers.authorization
      );
      // audience - role (rename)
      const { keyid: id, audience } = user?.payload ?? {
        keyid: undefined,
        audience: 0,
      };

      if (validateUID(id)) {
        if (audience) {
          await cancelSubscription({ keyid: id });
        }

        const [collection] = connect("Users");
        const [historyCollecion] = connect("History");

        await Promise.all([
          WebsitesController().removeWebsite({
            userId: id,
            deleteMany: true,
          }),
          collection.deleteOne({ id }),
          historyCollecion.deleteMany({ userId: id }),
        ]);
        message = `${SUCCESS}: account deleted.`;
        res.setCookie("jwt", "", cookieConfigs);
        res.clearCookie("jwt");
      }
    }

    res.status(200).send({
      data: null,
      message: message,
    });
  });

  // only used for github redirects non external for a11ywatch.com
  app.get("/github/callback", limiter, async (req, res) => {
    const requestToken = (req.query as any).code + "";
    const plan = (req.query as any).plan;

    let authentication = null;

    if (requestToken) {
      try {
        authentication = await onAuthGithub(requestToken);
      } catch (e) {
        console.error(e);
      }
    }

    res.redirect(
      authentication
        ? `${config.DOMAIN}/auth-redirect?${authentication}${
            plan ? `&plan=${plan}` : ""
          }`
        : config.DOMAIN
    );
  });

  // upgrade user account
  app.post("/api/upgrade", async (req, res) => {
    const body: any = req.body;

    if (req.cookies.jwt || req.headers.authorization) {
      const usr = getUserFromToken(
        req.cookies.jwt || req.headers.authorization
      );
      const id = usr?.payload?.keyid;

      if (body && validateUID(id)) {
        try {
          const response = await UsersController().addPaymentSubscription({
            keyid: id,
            stripeToken: body.stripeToken,
            yearly: body.yearly,
            paymentPlan: body.paymentPlan,
          });

          if (response?.user) {
            res.setCookie("jwt", response.user.jwt, cookieConfigs).send({
              message: response.message,
              data: cleanUserProps(response.user),
              success: response.success,
            });
          } else {
            res.status(StatusCode.BadRequest);
            res.send({
              data: null,
              message: "Plan was incorrect or price associated to plan.",
            });
          }
        } catch (e) {
          res.status(StatusCode.BadRequest);
          res.send({
            data: null,
            message: e?.message,
          });
        }
        return;
      }
    }

    res.status(200).send();
  });

  // cancel account subscription
  app.post("/api/cancel-subscription", async (req, res) => {
    // catch the stripe token incase of invalid usage
    if (req.cookies.jwt || req.headers.authorization) {
      const usr = getUserFromToken(
        req.cookies.jwt || req.headers.authorization
      );
      const id = usr?.payload?.keyid;

      if (validateUID(id)) {
        try {
          const response = await UsersController().cancelSubscription({
            keyid: id,
          });
          res.setCookie("jwt", "", cookieConfigs);
          res.clearCookie("jwt");
          res.send({
            message: response.message,
            data: response.user,
            success: response.success,
          });
        } catch (e) {
          res.status(StatusCode.BadRequest);
          res.send({
            data: null,
            message: e?.message,
          });
        }
        return;
      }
    }

    res.status(200).send();
  });
};
