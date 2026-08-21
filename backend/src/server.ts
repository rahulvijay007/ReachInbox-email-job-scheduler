import { app } from "./app";
import { env } from "./config/env";

app.listen(env.PORT, () => {
  console.log(`🚀 ReachInbox scheduler API listening on http://localhost:${env.PORT}`);
  console.log(`   (Run "npm run worker" in a separate process to actually send emails.)`);
});
