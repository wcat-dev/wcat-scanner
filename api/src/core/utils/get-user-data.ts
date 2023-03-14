import type { FastifyContext } from "apollo-server-fastify";
import type { User } from "../../types/schema";
import { UsersController } from "../controllers";
import {
  EMAIL_NEEDS_CONFIRMATION,
  GENERAL_ERROR,
  RATE_EXCEEDED_ERROR,
} from "../strings";
import { getUserFromToken, extractTokenKey } from "./get-user";
import { config } from "../../config/config";
import { frontendClientOrigin } from "./is-client";
import { StatusCode } from "../../web/messages/message";
import { validateUID } from "../../web/params/extracter";

// return a user from id
export const getUserFromId = async (user, keyid) => {
  // a valid keyid required
  if (!validateUID(keyid)) {
    return [null, null];
  }

  // [data, collection]
  return await UsersController({
    user,
  }).getUser({ id: keyid });
};

/*
 * Get the user if auth set or determine if request allowed.
 * This method handles sending headers and will return void next action should not occur. [TODO: refactor]
 * @return User
 **/
export const getUserFromApi = async (
  token: string,
  _req: FastifyContext["request"],
  res: FastifyContext["reply"]
): Promise<User> => {
  const jwt = extractTokenKey(token ? String(token).trim() : "");
  const user = getUserFromToken(jwt);
  const { keyid } = user?.payload ?? {};

  // simply get the user and return [no updates on counters]
  if (config.SUPER_MODE) {
    const [userData] = await getUserFromId(user, keyid);

    return userData;
  }

  // auth required unless front-end client
  if (!validateUID(keyid)) {
    res.send({
      data: null,
      message:
        "Authentication required. Add your authentication header and try again.",
      success: false,
    });
    return;
  }

  const [userData] = await getUserFromId(user, keyid);

  return userData;
};

/*
 * Get the user if auth set or determine if request allowed.
 * This method handles sending headers and will return void next action should not occur. [TODO: refactor]
 * @return User
 **/
export const allowedNext = (
  token: string,
  req: FastifyContext["request"],
  res: FastifyContext["reply"],
  mediaType?: "html" | "json"
): void | { id: number } => {
  const jwt = extractTokenKey(token ? String(token).trim() : "");
  const user = getUserFromToken(jwt);
  const { keyid } = user?.payload ?? {};

  // simply get the user and return [no updates on counters]
  if (config.SUPER_MODE || validateUID(keyid)) {
    return {
      id: keyid,
    };
  }

  // check if origin is from front-end client simply allow rate limits or super mode
  const isClient =
    frontendClientOrigin(req.headers["origin"]) ||
    frontendClientOrigin(req.headers["host"]) ||
    frontendClientOrigin(req.headers["referer"]);

  // auth required unless front-end client todo: determine application type
  if (!isClient) {
    if (mediaType === "html") {
      res.type("text/html").send(`
        <html>
          <body>
            <h1>${GENERAL_ERROR}</h1>
          </body>
        </html>
      `);
    } else {
      res.send({
        data: null,
        message:
          "Authentication required. Add your authentication header and try again.",
        success: false,
      });
    }
    return;
  }

  return {
    id: keyid,
  };
};

/*
 * Get user from token and db if allowed to perform request otherwise exit
 * Updates multi-site scan attempt counter.
 * A user id is required to target the website.
 * This method returns void and response status if un-authed
 * @returns Promise<User> | void
 */
export const getUserFromApiScan = async (
  token: string = "",
  _req: FastifyContext["request"],
  res: FastifyContext["reply"]
): Promise<User> => {
  // auth required unless SUPER MODE

  if (!token && !config.SUPER_MODE) {
    res.status(StatusCode.Unauthorized);
    res.send({
      data: null,
      message:
        "Authentication required. Add your Authorization header and try again.",
      success: false,
    });
    return;
  }

  const [user, collection] = await retreiveUserByToken(token);

  // if SUPER mode allow request reguardless of scans
  if (config.SUPER_MODE) {
    return user || {};
  }

  // user needs to confirm email free plans and possibly dns verification
  if (!user || (user && !user.emailConfirmed)) {
    res.status(StatusCode.Unauthorized);
    res.send({
      data: null,
      message: !user ? "User not found." : "Email confirmation required.",
      success: false,
    });
    return;
  }

  const [canScan, u] = await UsersController({
    user,
  }).updateScanAttempt({ id: user.id, user: user, collection });

  if (!canScan) {
    res.send({
      data: null,
      message: u.emailConfirmed
        ? RATE_EXCEEDED_ERROR
        : EMAIL_NEEDS_CONFIRMATION,
      success: false,
    });
    return;
  }

  return user;
};

/*
 * Get the user by jwt.
 * @return User
 **/
export const retreiveUserByToken = async (
  token: string
): Promise<[User, any]> => {
  const user = getUserFromToken(token);
  // the user id from the token
  const { keyid } = user?.payload ?? {};

  const [u, c] = await getUserFromId(user, keyid);

  return [u, c];
};

// wrapper to get data
export const retreiveUserByTokenWrapper = async (token) => {
  const [user] = await retreiveUserByToken(token);

  return user;
};
