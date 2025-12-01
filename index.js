import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "fs";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "url";

// ====== CONFIG ======
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawConfig = fs.readFileSync(path.join(__dirname, "config.json"), "utf8");
const config = JSON.parse(rawConfig);
config.token = process.env.TOKEN; // token depuis Koyeb
const prefix = config.prefix;

// ====== KEEP-ALIVE POUR KOYEB ======
const app = express();
app.get("/", (req, res) => res.send("Bot Actif 24/7 sur Koyeb"));
app.listen(8000, () => console.log("Serveur HTTP actif sur le port 8000"));

// ====== CLIENT ======
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

// ====== LOAD COMMANDES ======
const loadCommands = (dir) => {
  fs.readdirSync(dir).forEach(file => {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      loadCommands(filepath); // sous-dossiers
    } else if (file.endsWith('.js')) {
      import(`file://${path.resolve(filepath)}`).then(module => {
        const commandFunc = module.command || module.default || module;
        if (commandFunc && commandFunc.name) {
          client.commands.set(commandFunc.name, commandFunc);
          console.log(`Commande chargée : ${commandFunc.name}`);
        }
      }).catch(err => console.error(`Erreur chargement ${file} :`, err));
    }
  });
};

loadCommands(path.join(__dirname, "Commands"));

// ====== MESSAGE HANDLER ======
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const commandFunc = client.commands.get(commandName);
  if (!commandFunc) return;

  try {
    await commandFunc.run(client, message, args, config);
  } catch (e) {
    console.error(e);
    message.reply("❌ Une erreur est survenue.");
  }
});

// ====== READY ======
client.on("ready", () => {
  console.log(`${client.user.tag} est en ligne !`);
});

// ====== LOGIN ======
client.login(config.token);
