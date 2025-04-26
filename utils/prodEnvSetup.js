import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

if (process.env.CONFIG_SECRET_ARN && process.env.AWS_DEFAULT_REGION) {
  console.log("Loading settings from SecretsManager.");
  const client = new SecretsManagerClient({
    region: process.env.AWS_DEFAULT_REGION,
  });
  const command = new GetSecretValueCommand({
    SecretId: process.env.CONFIG_SECRET_ARN,
  });
  try {
    const data = await client.send(command);
    const secretValue = data.SecretString;
    if (secretValue) {
      const secrets = JSON.parse(secretValue);
      for (const key in secrets) {
        process.env[key] = secrets[key];
      }
    }
  } catch (error) {
    console.error("Error writing config file:", error);
  }
} else {
  console.log("CONFIG_SECRET_ARN or AWS_DEFAULT_REGION missing, not loading config from secrets manager..");
}
