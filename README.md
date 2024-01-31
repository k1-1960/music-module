# @k1-1960/music-module

Play music with your discord bot.

## Usage (TypeScript)

```ts
// Import necessary modules.
import 'dotenv/config';
import { joinVoiceChannel } from '@discordjs/voice';
import { Client, EmbedBuilder, GatewayIntentBits, Message } from 'discord.js';
import {
  Track, // Track builder
  MusicSubscription, // Music Subscription builder.
  TrackMetadataDetails, // Type for track details (you don't need to import this if you are not working on TypeScript).
} from '@k11960/music-module'; // <<< Import this package.

// Creating a discord.js bot instance.
const bot = new Client({
  intents:
    GatewayIntentBits.Guilds |
    GatewayIntentBits.GuildMembers |
    GatewayIntentBits.GuildMessages |
    GatewayIntentBits.MessageContent |
    GatewayIntentBits.GuildVoiceStates, // <<< This intent is very important!!!
});

// Creating a collection/map where we will save all Music Subscriptions.
const subs = new Map();
/*
 * '123456789012345' => MusicSubscription {
 *    ...
 *  }
 */

// Creating an event to listen to the message commands.
bot.on('messageCreate', async (message) => {
  // Setting a prefix.
  let prefix = '.';

  // We will not respond to bots and messages that don't start with our prefix.
  if (message.author.bot || message.content.startsWith(prefix) === false)
    return;

  // Removing the prefix and splitting the command into "words".
  let args = message.content.slice(prefix.length).trim().split(/ +/g);

  // As the command is the first word, we can do a shift() and now args are only arguments without the command, but the command will be stored here:
  let command = args.shift();

  // Handling the commands.
  switch (command) {
    // "play" command.
    case 'play':
      // Searching the guild subscription; don't worry, it could be null. We will solve this later.
      let sub: MusicSubscription = subs.get(message.guildId);
      // Saving the voice channel in a variable.
      let channel = message.member?.voice.channel;
      // Now, we join all arguments into a single string; this is the title of the song / YouTube video.
      let songTitle = args.join(' ');

      // If the channel variable is null or undefined, it means that the user is not in a voice channel; the user needs to be in a voice channel.
      if (!channel) {
        message.reply({
          content:
            'You need to be in a voice channel before executing this command.',
        });
        return;
      }

      // If the guild subscription doesn't exist on our Map, we will create a new one and push it in the map.
      if (!sub) {
        // Create the MusicSubscription instance.
        let newSub = new MusicSubscription(
          // We need to create a voice connection. This function joins the bot to the user's voice channel and returns a VoiceConnection instance.
          joinVoiceChannel({
            adapterCreator: message.guild!.voiceAdapterCreator,
            channelId: channel.id,
            guildId: message.guildId!,
          })
        );

        // [Optional but recommended] Adding events.

        // when a song is starting.
        newSub.on(
          'songStarted',
          async (reference: Message, details: TrackMetadataDetails) => {
            reference.channel.send({
              embeds: [
                new EmbedBuilder({
                  title: 'Now playing ' + details.title,
                  description: 'Requested by ' + reference.author.displayName,
                  fields: [
                    {
                      name: 'Uploaded by',
                      value: details.uploadedBy,
                      inline: true,
                    },
                    {
                      name: 'Duration',
                      value: details.duration.timestamp,
                      inline: true,
                    },
                  ],
                  color: 0xdd3939,
                }).setThumbnail(details.coverArt),
              ],
            });
          }
        );

        // --------- Pushing the new instance in our map --------------
        subs.set(message.guildId, newSub);
        // Replacing the null variable with the new instance.
        sub = newSub;
      }

      // Creating a track instance from the song title.
      let newTrack = await Track.create(songTitle + ' topic', message); // here the message argument is provided as a reference; it's used in the events.

      // Add the song to the guild queue.
      sub.enqueue(newTrack);
      break;
  }
});

// Simple ready event.
bot.once('ready', () => {
  console.log(bot.user?.tag, 'is ready.');
});

// Login to our Discord bot.
bot.login(process.env.DISCORD_TOKEN as string);
```
