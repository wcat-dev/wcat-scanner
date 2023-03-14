import { SUPER_MODE } from "../../../config/config";

const UserModel = {
  email: "",
  password: "",
  salt: "",
  id: -1, // [DEPRECATED DEFAULT]: was set to 1 to inc between as old counter
  jwt: "",
  role: SUPER_MODE ? 2 : 0,
  alertEnabled: true,
  emailConfirmed: false,
  profileVisible: false,
  lastLoginDate: "",
  usageAnchorDate: 0,
  passwordRequired: false,
  // api usage
  scanInfo: {
    lastScanDate: null,
    totalUptime: 0, // total scan uptime from plans
    creditedUptime: 0, // uptime credits applied to account outside of plan usage negate against
  },
  websiteLimit: 1, // limit of websites a user can have
  googleId: "",
  githubId: null,
  resetCode: null,
  pageSpeedApiKey: "",
  stripeID: "", // payments
};

// add defaults from user model and set the lastLoginDate to the current date
const makeUser = (extra: any = {}): typeof UserModel => {
  const currentDate = new Date();

  return Object.assign(
    {},
    UserModel,
    {
      lastLoginDate: currentDate,
      usageAnchorDate: currentDate,
    },
    extra
  );
};

export { UserModel, makeUser };
