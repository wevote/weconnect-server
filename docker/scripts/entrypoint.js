#!/usr/bin/env node

import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { spawn } from "child_process";

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
    console.error("Error getting configuration from secretsmanager:", error);
  }
} else {
  console.log("CONFIG_SECRET_ARN or AWS_DEFAULT_REGION missing, not loading config from secrets manager..");
}

const cmd = process.argv[2]
const args = process.argv.slice(3);
console.log("Running command [", cmd, "] with args", args);
const child = spawn(cmd, args, {
    detached: true,
    //stdio: 'ignore',
    shell: true,
});
child.stdout.on('data', (data) => {
    console.log(`${data}`);
});
child.stderr.on('data', (data) => {
    console.log(`${data}`);
});
child.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
});
child.unref();
