import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "fs";
import express from "express";

// ====== CONFIG ======
const config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
const prefix = config.prefix;

// ====== KEEP-ALIVE ======
const app = express();
app.get("/", (req, res) => res.send("Bot Actif 24/7 sur Koyeb"));
app.listen(8000, () => console.log("Serveur HTTP actif sur le port 8000"));

// ====== CLIENT ======
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.commands = new Collection();

// ====== CHARGEMENT DES COMMANDES ======
const commandFiles = fs.readdirSync("./Commands").filter(f => f.endsWith(".js"));

for (const file of commandFiles) {
  const { name, run } = await import(`./Commands/${file}`);
  client.commands.set(name, { run });
  console.log(`Commande chargée : ${name}`);
}

// ====== HANDLER DE MESSAGES ======
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    await command.run(client, message, args);
  } catch (err) {
    console.error(err);
    message.reply("❌ Une erreur est survenue !");
  }
});

// ====== READY ======
client.on("ready", () => {
  console.log(`${client.user.tag} est en ligne !`);
});

// ====== LOGIN ======
client.login(config.token);
