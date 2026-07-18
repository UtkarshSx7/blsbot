const { Client, GatewayIntentBits, Events, EmbedBuilder, ActivityType, ApplicationCommandOptionType } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

const TOKEN = process.env.DISCORD_TOKEN;
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;
const WELCOME_MESSAGE = process.env.WELCOME_MESSAGE || 'Welcome to the server! Please read the rules and enjoy your stay.';

const COMMAND_DEFINITIONS = [
  {
    name: 'security',
    description: 'Show a snapshot of server security settings',
    options: [],
  },
  {
    name: 'msg',
    description: 'Send an anonymous message to this channel',
    options: [
      {
        name: 'text',
        description: 'The message to send',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  {
    name: 'ping',
    description: 'Check the bot responsiveness',
    options: [],
  },
  {
    name: 'roll',
    description: 'Roll a random number up to a maximum',
    options: [
      {
        name: 'max',
        description: 'Optional maximum value (default: 100)',
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
    ],
  },
  {
    name: 'coinflip',
    description: 'Flip a coin',
    options: [],
  },
  {
    name: 'serverinfo',
    description: 'Show basic server information',
    options: [],
  },
  {
    name: 'help',
    description: 'Show a list of available commands',
    options: [],
  },
];

if (!TOKEN) {
  console.error('Missing DISCORD_TOKEN. Set it in the deployment environment or a .env file.');
  process.exit(1);
}

function buildSecurityReport(guild) {
  const verificationLevel = guild.verificationLevel;
  const defaultMemberPermissions = guild.members.me?.permissions?.has('Administrator') || false;
  const explicitContentFilter = guild.explicitContentFilter;

  const embed = new EmbedBuilder()
    .setTitle('Server Security Snapshot')
    .setColor(0x5865f2)
    .addFields(
      { name: 'Verification Level', value: verificationLevel.toString(), inline: true },
      { name: 'Explicit Content Filter', value: explicitContentFilter.toString(), inline: true },
      { name: 'Bot Has Administrator', value: defaultMemberPermissions ? 'Yes' : 'No', inline: true },
      { name: 'Member Count', value: guild.memberCount.toString(), inline: true },
      { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true }
    );

  return embed;
}

function buildHelpEmbed() {
  return new EmbedBuilder()
    .setTitle('Available Commands')
    .setColor(0x5865f2)
    .addFields(
      { name: '/msg <text>', value: 'Send an anonymous message to the current channel.', inline: false },
      { name: '/ping', value: 'Check bot responsiveness.', inline: false },
      { name: '/roll [max]', value: 'Roll a random number up to the provided maximum.', inline: false },
      { name: '/coinflip', value: 'Flip a coin and get heads or tails.', inline: false },
      { name: '/serverinfo', value: 'Show basic server details.', inline: false },
      { name: '/security', value: 'Show a summary of server security settings.', inline: false }
    );
}

async function setBotPresence() {
  // Use an explicit presence name, overridable via PRESENCE_NAME env var.
  const presenceName = process.env.PRESENCE_NAME || 'The BLS Security';

  if (client.user) {
    await client.user.setActivity({
      name: `Watching : ${presenceName}`,
      type: ActivityType.Watching,
    });
  }
}

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const guilds = client.guilds.cache.map((guild) => guild.name).join(', ') || 'none';
  console.log(`Connected guilds: ${guilds}`);

  await setBotPresence();
});

client.on(Events.GuildMemberAdd, async (member) => {
  const channel = WELCOME_CHANNEL_ID
    ? member.guild.channels.cache.get(WELCOME_CHANNEL_ID)
    : member.guild.systemChannel;

  const welcomeText = `${member.user.tag} joined the server.`;

  if (channel && channel.isTextBased()) {
    await channel.send(`${WELCOME_MESSAGE}\n${welcomeText}`);
  }

  try {
    await member.send(`Welcome to ${member.guild.name}!\n${WELCOME_MESSAGE}`);
  } catch (error) {
    console.warn(`Could not DM ${member.user.tag}: ${error.message}`);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'security') {
    const embed = buildSecurityReport(interaction.guild);
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (interaction.commandName === 'msg') {
    const text = interaction.options.getString('text', true);

    if (!interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.reply({ content: 'This command can only be used in a text channel.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    await interaction.channel.send(text);
    await interaction.editReply('Message sent.');
    return;
  }

  if (interaction.commandName === 'ping') {
    const latency = Date.now() - interaction.createdTimestamp;
    await interaction.reply({ content: `Pong! Latency: ${latency}ms`, ephemeral: true });
    return;
  }

  if (interaction.commandName === 'roll') {
    const max = interaction.options.getInteger('max') ?? 100;
    const roll = Math.floor(Math.random() * Math.max(max, 1)) + 1;
    await interaction.reply({ content: `🎲 Rolled: ${roll}`, ephemeral: true });
    return;
  }

  if (interaction.commandName === 'coinflip') {
    const result = Math.random() > 0.5 ? 'Heads' : 'Tails';
    await interaction.reply({ content: `🪙 ${result}`, ephemeral: true });
    return;
  }

  if (interaction.commandName === 'serverinfo') {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(guild.name)
      .setColor(0x5865f2)
      .addFields(
        { name: 'Members', value: guild.memberCount.toString(), inline: true },
        { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Created', value: guild.createdAt.toDateString(), inline: true }
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (interaction.commandName === 'help') {
    const embed = buildHelpEmbed();
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
});

async function registerSlashCommands(client) {
  const guildId = process.env.GUILD_ID;
  if (!guildId) {
    console.log('GUILD_ID not set. Skip per-guild slash command registration.');
    return;
  }
  try {
    // Fetch the guild from the API to ensure it's available even if not cached.
    const guild = await client.guilds.fetch(guildId);

    // Use commands.set to register (and update) all commands for the guild at once.
    // Guild commands appear immediately in Discord.
    await guild.commands.set(COMMAND_DEFINITIONS);

    console.log(`Slash commands registered for guild ${guildId}`);
  } catch (error) {
    console.warn('Could not register slash commands:', error.message);
  }
}

client.on(Events.ClientReady, async () => {
  await registerSlashCommands(client);
});

client.on(Events.GuildCreate, async () => {
  await registerSlashCommands(client);
  await setBotPresence();
});

client.login(TOKEN);
