import { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js';
import db from '../../Events/loadDatabase.js';
import config from '../../config.json' with { type: 'json' };

export const command = {
    name: 'ticket',
    helpname: 'ticket <catégorie id>',
    description: 'Permet de configurer les tickets',
    help: 'ticket <catégorie id>',
    run: async (bot, message, args) => {

        // Vérification de permission
        if (!config.owners.includes(message.author.id)) {
            return message.reply({ content: "❌ Vous n'avez pas la permission d'utiliser cette commande." });
        }

        const category = message.guild.channels.cache.get(args[0]);
        if (!category || category.type !== 4) return message.reply({ content: "ID Catégorie invalide." });

        // Enregistrement de la catégorie dans la BDD
        db.run(
            `CREATE TABLE IF NOT EXISTS ticket (guild TEXT PRIMARY KEY, category TEXT)`,
            [],
            () => {
                db.run(
                    `INSERT OR REPLACE INTO ticket (guild, category) VALUES (?, ?)`,
                    [message.guild.id, category.id]
                );
            }
        );

        const options = [
            { key: 'option1', label: config.option1 },
            { key: 'option2', label: config.option2 },
            { key: 'option3', label: config.option3 },
            { key: 'option4', label: config.option4 }
        ].filter(opt => opt.label && opt.label.trim() !== '');

        if (options.length === 0) return message.reply({ content: 'Aucune option pour le ticket n\'est configurée.' });

        const ticketMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_select')
            .setPlaceholder('Choisissez une option')
            .addOptions(options.map(opt => ({ label: opt.label, value: opt.key })));

        const embed = new EmbedBuilder()
            .setTitle(config.titre || 'Ticket')
            .setDescription(config.description)
            .setColor(config.color)
            .setFooter({ text: config.tfooter || '', iconURL: message.guild.iconURL({ dynamic: true }) });

        await message.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(ticketMenu)] });
    },
};

// Listener pour gérer l'ouverture des tickets
export const interactionHandler = (bot) => {
    bot.on('interactionCreate', async (interaction) => {
        if (!interaction.isStringSelectMenu()) return;
        if (interaction.customId !== 'ticket_select') return;

        await interaction.deferReply({ ephemeral: true });

        const selected = interaction.values[0];
        const guild = interaction.guild;

        const dbTicket = await new Promise((resolve, reject) => {
            db.get('SELECT category FROM ticket WHERE guild = ?', [guild.id], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (!dbTicket) return interaction.editReply({ content: "Catégorie de ticket non configurée." });

        const category = guild.channels.cache.get(dbTicket.category);
        if (!category) return interaction.editReply({ content: "Catégorie configurée introuvable." });

        // Création du channel avec permissions
        const ticketChannel = await guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: 0, // text channel
            parent: category.id,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    deny: ['ViewChannel'],
                },
                {
                    id: interaction.user.id,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
                },
                {
                    id: '1444478869582381276', // Rôle staff
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
                }
            ]
        });

        ticketChannel.send(`Ticket ouvert pour : ${interaction.user}`);

        await interaction.editReply({ content: `Votre ticket a été créé : ${ticketChannel}` });
    });
};
