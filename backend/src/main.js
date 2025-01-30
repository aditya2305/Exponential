import { checkMessages } from "../jobs/checkMessages.js";

export const mother = async () => {
  console.log("Mother function is running...");

  setInterval(() => {
    checkMessages();
  }, 60_000);
};
