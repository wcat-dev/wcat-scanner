const LOG_ENABLED = process.env.COMPUTER_VISION_LOG_ENABLED;

export const logError = (e) => LOG_ENABLED && console.error(e);
