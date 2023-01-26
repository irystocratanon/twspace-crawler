import {exists} from 'fs'
import {writeFile} from 'fs/promises'
import {promisify} from 'util'
import winston from 'winston'
import { Catbox, Litterbox } from 'catbox.moe'
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
				  const has_file = await promisify(exists)(audioFile)
				  if (has_file) {
					//const uploader = new Litterbox();
					const uploader = new Catbox();
					const upload_it = await uploader.upload(audioFile)
					const save_url = `${audioFile.substr(0, audioFile.lastIndexOf(".m4a"))} catbox.txt`
					self.logger.info(`SpaceWatcher@${spaceId} ${upload_it}`)
					await writeFile(save_url, upload_it)
				  }
			  })(this)
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
