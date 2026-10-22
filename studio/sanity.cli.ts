import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'c8rr77b1',
    dataset: 'production',
  },
  studioHost: 'itai-agami',
  deployment: {
    appId: 'wf181esvuvt281w8dcynkap5',
    autoUpdates: true,
  },
})
