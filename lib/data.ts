export interface ImageData {
  url: string
  width: number
  height: number
}

export interface Work {
  id: number
  favorStatus: number
  status: number
  createtime: string
  htUid: string
  roleName: string
  serverName: string
  name: string
  image?: string // JSON string containing ImageData[]
  imageUrls?: string[]
  tagList: string
  ticket: number
}

export interface APIResponse {
  list: Work[]
  hasNext: boolean
}
