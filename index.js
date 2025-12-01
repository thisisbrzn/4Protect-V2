import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "fs";
import path from "path";
import express from "express";

// ====== CONFIG ======
const config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
config.token = process.env.TOKEN; // Token depuis Koyeb

const prefix = config.prefix;

// ====== KEEP-ALIVE POUR KOYEB ======
const app = express();
app.get("/", (req, res) => res.send("Bot Actif 24/7"));
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

// ====== CHARGEMENT DES COMMANDES ======
const commandsPath = path.join(process.cwd(), "Commands");

fs.readdirSync(commandsPath).forEach(file => {
  if (!file.endsWith(".js")) return;

  const filePath = path.join(commandsPath, file);

  import(`file://${filePath}`)
    .then(module => {
      const cmd = module.command || module.default;
      if (!cmd || !cmd.name || !cmd.run) {
        console.log(`❌ Commande ignorée (mauvais format) : ${file}`);
        return;
      }

      client.commands.set(cmd.name, cmd);
      console.log(`✔️ Commande chargée : ${cmd.name}`);
    })
    .catch(err => console.error(`Erreur chargement ${file} :`, err));
});

// ====== MESSAGE HANDLER ======
client.on("messageCreate", async message => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    await command.run(client, message, args);
  } catch (err) {
    console.error(err);
    message.reply("❌ Une erreur est survenue lors de l'exécution de la commande.");
  }
});

// ====== READY ======
client.on("ready", () => {
  console.log(`${client.user.tag} est en ligne !`);
});

// ====== LOGIN ======
client.login(config.token);
