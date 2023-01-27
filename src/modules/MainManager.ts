import axios from 'axios'
import FormData from 'form-data'
import { Blob } from 'buffer'
import { createReadStream, exists } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { promisify } from 'util'
import winston from 'winston'
import { logger as baseLogger } from '../logger'
import { SpaceWatcher } from './SpaceWatcher'
import { UserListWatcher } from './UserListWatcher'
import { UserWatcher } from './UserWatcher'

class MainManager {
  private logger: winston.Logger
  private userWatchers: Record<string, UserWatcher> = {}
  private spaceWatchers: Record<string, SpaceWatcher> = {}

  constructor() {
    this.logger = baseLogger.child({ label: '[MainManager]' })
  }

  public addSpaceWatcher(spaceId: string) {
    const watchers = this.spaceWatchers
    if (watchers[spaceId]) {
      return
    }
    const watcher = new SpaceWatcher(spaceId)
    watchers[spaceId] = watcher
    watcher.watch()
    watcher.once('complete', () => {
      this.logger.debug(`SpaceWatcher@${spaceId} complete`)
      if (!watchers[spaceId]) {
        return
      }
	  const space = watchers[spaceId]["downloader"]
	  if (space) {
		  const audioFile = space["audioFile"]
		  if (audioFile) {
			  (async function(self) {
				  let once = false;
				  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
				  for (let n = 0; n < 60; n++) {
				  	const has_file = await promisify(exists)(audioFile)
				  	if (has_file) {
				  	  self.logger.verbose(`Catbox@${spaceId}`)
				  	  for (let i = 0; i < 6; i++) {
				  	  	try {
				  	  		self.logger.debug(`Catbox@${spaceId} attempt: ${i}`)
				  	  		//const uploader = new Litterbox();
							let form = new FormData();
							form.append('reqtype', 'fileupload')
							// in case there are problems with userHash try to do anonymous upload
							if (process.env.CATBOX_USER_HASH && i < 3) {
								form.append('userhash', process.env.CATBOX_USER_HASH)
							}
							//const file = await readFile(audioFile)
							//const fileData = new Blob([file])
							//form.append('fileToUpload', fileData, audioFile.replace(/[^\x00-\x7F]/g, ""))
							const fileStream = createReadStream(audioFile)
							form.append('fileToUpload', fileStream, audioFile.replace(/[^\x00-\x7F]/g, ""))
				  	  		//const upload_it = await axios.post('https://catbox.moe/user/api.php', form, {headers: {...form.getHeaders()}})
				  	  		const upload_it = await axios.post('https://catbox.moe/user/api.php', form, {
								maxContentLength: Infinity,
								maxBodyLength: Infinity,
								headers: {'Content-Type': 'multipart/form-data;boundary=' + form.getBoundary()}
							})
				  	  		const save_url = `${audioFile.substr(0, audioFile.lastIndexOf(".m4a"))} catbox.txt`
							const saved_it = upload_it.data
				  	  		self.logger.info(`SpaceWatcher@${spaceId} ${saved_it}`)
							if (!saved_it || !saved_it.match(/^https?:\/\/(files|litter).catbox.moe\/[\w.]+$/)) {
								continue
							}
				  	  		await writeFile(save_url, saved_it)
				  	  		self.logger.debug(`Catbox@${spaceId} attempt: ${i} complete`)
				  	  		break
				  	  	} catch (error) {
				  	  		console.trace(error);
				  	  		self.logger.error(`Catbox: ${error.message}`);
				  	  	}
				  	  }
					  break
				  	} else {
						if (!once) {
							once = true;
							self.logger.verbose(`SpaceWatcher@${spaceId} audioFile (${audioFile}) does not exist`);
							self.logger.verbose(`SpaceWatcher@${spaceId} Waiting up to 60 seconds for it to appear`);
						}
				  	    self.logger.debug(`SpaceWatcher@${spaceId} ${n}:`, has_file)
						await delay(1000);
				  	}
				  }
			  })(this)
		  } else {
      		this.logger.debug(`SpaceWatcher@${spaceId} audioFile: `, audioFile)
		  }
	  }
      delete watchers[spaceId]
      this.logger.debug(`SpaceWatcher@${spaceId} delete`)
    })
  }

  public addUserWatcher(username: string) {
    const watchers = this.userWatchers
    if (watchers[username]) {
      return
    }
    const watcher = new UserWatcher(username)
    watchers[username] = watcher
    watcher.watch()
    watcher.on('data', (id) => {
      this.addSpaceWatcher(id)
    })
  }

  public runUserListWatcher() {
    const watcher = new UserListWatcher()
    watcher.watch()
    watcher.on('data', (id) => {
      this.addSpaceWatcher(id)
    })
  }
}

export const mainManager = new MainManager()
