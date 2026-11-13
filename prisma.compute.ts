import { defineComputeConfig } from "@prisma/compute-sdk/config";

export default defineComputeConfig({
  app: {
    name: "web",
    region: "eu-central-1",
    framework: "nextjs",
    httpPort: 3000,
  },
});
