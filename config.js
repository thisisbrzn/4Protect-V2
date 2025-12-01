import fs from "fs";

// On lit le JSON
const rawConfig = fs.readFileSync(new URL("./config.json", import.meta.url));
const config = JSON.parse(rawConfig.toString());

// On remplace le token par la variable d'environnement
config.token = process.env.TOKEN;

export default config;
