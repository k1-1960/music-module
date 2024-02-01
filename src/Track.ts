import {
  AudioResource,
  createAudioResource,
  demuxProbe,
} from '@discordjs/voice';
import puppeteer from 'puppeteer';
import ytdl, { thumbnail } from 'ytdl-core';
import { durationWrapper, WrappedDuration } from './functions/durationWrapper';
const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w.-]*)*\/?$/;

export function isURL(text: string) {
  return urlRegex.test(text);
}

export interface TrackMetadata {
  reference: any;
  details: TrackMetadataDetails;
}
export interface TrackMetadataDetails {
  title: string;
  duration: WrappedDuration;
  uploadedBy: string;
  coverArt: string;
}

export class Track {
  query: string;
  url: string | undefined;
  audioResource: AudioResource<TrackMetadata> | undefined;
  reference: any;

  /**
   * Private constructor. Use the static method `create` instead.
   * @param {string} query
   */
  private constructor(query: string, reference: any) {
    this.query = query;
    this.reference = reference;
  }

  /**
   * Create a new Track instance, with a fetched video URL and an AudioResource.
   * @param {string} query
   * @returns {Promise<Track>} A Promise that resolves to a new Track instance.
   */
  static async create(query: string, reference?: any): Promise<Track> {
    const track = new Track(query, reference);
    if (!isURL(query)) await track.fetchURL();
    track.audioResource = await track.createAudioResource(track.url as string);
    return track;
  }

  private async fetchURL() {
    try {
      const browser = await puppeteer.launch({
        headless: 'new',
      });
      const page = await browser.newPage();
      await page.goto(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(
          this.query
        )}`
      );
      await page.waitForSelector('a#video-title');
      this.url = await page.$eval('a#video-title', (element) => {
        return 'https://www.youtube.com' + element.getAttribute('href');
      });

      await browser.close();
    } catch (error) {
      throw error;
    }
  }

  private fetchMetadata(url: string): Promise<TrackMetadataDetails> {
    return new Promise(async (resolve, reject) => {
      try {
        const videoInfo = await ytdl.getBasicInfo(url);
        resolve({
          title: videoInfo.videoDetails.title,
          duration: durationWrapper(
            Number(videoInfo.videoDetails.lengthSeconds)
          ),
          uploadedBy:
            videoInfo.videoDetails.author.name +
            '(' +
            videoInfo.videoDetails.author.user +
            ')',
          coverArt: (videoInfo.videoDetails.thumbnails[0] as thumbnail).url,
        });
      } catch (error) {
        reject('Metadata fetch error: ' + (error as Error).message);
      }
    });
  }

  private createAudioResource(
    url: string
  ): Promise<AudioResource<TrackMetadata>> {
    return new Promise(async (resolve, reject) => {
      const stream = ytdl(url, {
        quality: 'lowestaudio',
        filter: 'audioonly',
        highWaterMark: 1 << 62,
        liveBuffer: 1 << 62,
        dlChunkSize: 0,
      });

      const details = await this.fetchMetadata(url);

      const onError = (error: Error) => {
        stream.destroy();
        reject(error);
      };

      stream.once('readable', () => {
        demuxProbe(stream)
          .then((probe) => {
            resolve(
              createAudioResource(probe.stream, {
                metadata: {
                  reference: this.reference,
                  details,
                },
                inputType: probe.type,
              })
            );
          })
          .catch(onError);
      });

      stream.once('error', onError);
    });
  }
}
