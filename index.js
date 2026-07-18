const { Client, GatewayIntentBits, Events, EmbedBuilder, ActivityType } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

const TOKEN = process.env.DISCORD_TOKEN;
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;
const WELCOME_MESSAGE = process.env.WELCOME_MESSAGE || 'Welcome to the server! Please read the rules and enjoy your stay.';

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

async function setBotPresence() {
  const guildId = process.env.GUILD_ID;
  const guild = guildId ? client.guilds.cache.get(guildId) : client.guilds.cache.first();
  const guildName = guild?.name || 'your server';

  if (client.user) {
    await client.user.setActivity({
      name: `Watching : ${guildName}`,
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
  }
});

async function registerSlashCommand(client) {
  const guildId = process.env.GUILD_ID;
  if (!guildId) {
    console.log('GUILD_ID not set. Skip per-guild slash command registration.');
    return;
  }

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    console.log(`Guild ${guildId} not found in cache yet. Waiting for guild to become available...`);
    return;
  }

  try {
    const existingCommands = await guild.commands.fetch();
    const hasSecurityCommand = existingCommands.some((command) => command.name === 'security');

    if (!hasSecurityCommand) {
      await guild.commands.create({
        name: 'security',
        description: 'Show a snapshot of server security settings',
      });
    }

    console.log('Slash command ready');
  } catch (error) {
    console.warn('Could not register slash command:', error.message);
  }
}

client.on(Events.ClientReady, async () => {
  await registerSlashCommand(client);
});

client.on(Events.GuildCreate, async () => {
  await registerSlashCommand(client);
  await setBotPresence();
});

client.login(TOKEN);
