// remove base64 and just get data @return string
export const base64Replacer = (base: string) => {
  return base ? base.split(",")[1] : "";
};
