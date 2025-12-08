import { AuthConfig } from "convex/server";

const authConfig = {
  providers: [
    {
      domain: "https://clerk.aegislogistics.co.uk",
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;

export default authConfig;
