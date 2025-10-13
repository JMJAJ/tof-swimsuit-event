/**
 * Tower of Fantasy server mappings by region (correct server list)
 */

export interface ServerInfo {
    name: string
    region: string
    id: number
}

export const SERVERS_DATA: Record<string, ServerInfo[]> = {
    "Asia-Pacific": [
        { name: "Eden", region: "Asia-Pacific", id: 11001 },
        { name: "Fate", region: "Asia-Pacific", id: 11002 },
        { name: "Nova", region: "Asia-Pacific", id: 11003 },
        { name: "Ruby", region: "Asia-Pacific", id: 11004 },
        { name: "Babel", region: "Asia-Pacific", id: 11005 },
        { name: "Gomap", region: "Asia-Pacific", id: 11006 },
        { name: "Pluto", region: "Asia-Pacific", id: 11007 },
        { name: "Sushi", region: "Asia-Pacific", id: 11008 },
        { name: "Venus", region: "Asia-Pacific", id: 11009 },
        { name: "Galaxy", region: "Asia-Pacific", id: 11010 },
        { name: "Memory", region: "Asia-Pacific", id: 11011 },
        { name: "Oxygen", region: "Asia-Pacific", id: 11012 },
        { name: "Sakura", region: "Asia-Pacific", id: 11013 },
        { name: "Seeker", region: "Asia-Pacific", id: 11014 },
        { name: "Shinya", region: "Asia-Pacific", id: 11015 },
        { name: "Stella", region: "Asia-Pacific", id: 11016 },
        { name: "Uranus", region: "Asia-Pacific", id: 11017 },
        { name: "Utopia", region: "Asia-Pacific", id: 11018 },
        { name: "Jupiter", region: "Asia-Pacific", id: 11019 },
        { name: "Sweetie", region: "Asia-Pacific", id: 11020 },
        { name: "Atlantis", region: "Asia-Pacific", id: 11021 },
        { name: "Daybreak", region: "Asia-Pacific", id: 11022 },
        { name: "Takoyaki", region: "Asia-Pacific", id: 11023 },
        { name: "Adventure", region: "Asia-Pacific", id: 11024 },
        { name: "Yggdrasil", region: "Asia-Pacific", id: 11025 },
        { name: "Cocoaiteruyo", region: "Asia-Pacific", id: 11026 },
        { name: "Food fighter", region: "Asia-Pacific", id: 11027 },
        { name: "Mars", region: "Asia-Pacific", id: 11028 },
        { name: "Vega", region: "Asia-Pacific", id: 11029 },
        { name: "Neptune", region: "Asia-Pacific", id: 11030 },
        { name: "Tenpura", region: "Asia-Pacific", id: 11031 },
        { name: "Moon", region: "Asia-Pacific", id: 11032 },
        { name: "Mihashira", region: "Asia-Pacific", id: 11033 },
        { name: "Cocokonderu", region: "Asia-Pacific", id: 11034 }
    ],
    "North America": [
        { name: "The Glades", region: "North America", id: 12001 },
        { name: "Nightfall", region: "North America", id: 12002 },
        { name: "Frontier", region: "North America", id: 12003 },
        { name: "Libera", region: "North America", id: 12004 },
        { name: "Solaris", region: "North America", id: 12005 },
        { name: "Freedom-Oasis", region: "North America", id: 12006 },
        { name: "The worlds between", region: "North America", id: 12007 },
        { name: "Radiant", region: "North America", id: 12008 },
        { name: "Tempest", region: "North America", id: 12009 },
        { name: "New Era", region: "North America", id: 12010 },
        { name: "Observer", region: "North America", id: 12011 },
        { name: "Lunalite", region: "North America", id: 12012 },
        { name: "Starlight", region: "North America", id: 12013 },
        { name: "Myriad", region: "North America", id: 12014 },
        { name: "Lighthouse", region: "North America", id: 12015 },
        { name: "Oumuamua", region: "North America", id: 12016 },
        { name: "Eternium Phantasy", region: "North America", id: 12017 },
        { name: "Sol-III", region: "North America", id: 12018 },
        { name: "Silver Bridge", region: "North America", id: 12019 },
        { name: "Azure Planes", region: "North America", id: 12020 },
        { name: "Nirvana", region: "North America", id: 12021 },
        { name: "Ozera", region: "North America", id: 12022 },
        { name: "Polar", region: "North America", id: 12023 },
        { name: "Oasis", region: "North America", id: 12024 }
    ],
    "Europe": [
        { name: "Aimanium", region: "Europe", id: 13001 },
        { name: "Alintheus", region: "Europe", id: 13002 },
        { name: "Andoes", region: "Europe", id: 13003 },
        { name: "Anomora", region: "Europe", id: 13004 },
        { name: "Astora", region: "Europe", id: 13005 },
        { name: "Valstamm", region: "Europe", id: 13006 },
        { name: "Blumous", region: "Europe", id: 13007 },
        { name: "Celestialrise", region: "Europe", id: 13008 },
        { name: "Cosmos", region: "Europe", id: 13009 },
        { name: "Dyrnwyn", region: "Europe", id: 13010 },
        { name: "Elypium", region: "Europe", id: 13011 },
        { name: "Excalibur", region: "Europe", id: 13012 },
        { name: "Espoir IV", region: "Europe", id: 13013 },
        { name: "Estrela", region: "Europe", id: 13014 },
        { name: "Ether", region: "Europe", id: 13015 },
        { name: "Ex Nihilor", region: "Europe", id: 13016 },
        { name: "Futuria", region: "Europe", id: 13017 },
        { name: "Hephaestus", region: "Europe", id: 13018 },
        { name: "Midgard", region: "Europe", id: 13019 },
        { name: "Iter", region: "Europe", id: 13020 },
        { name: "Kuura", region: "Europe", id: 13021 },
        { name: "Lycoris", region: "Europe", id: 13022 },
        { name: "Lyramiel", region: "Europe", id: 13023 },
        { name: "Magenta", region: "Europe", id: 13024 },
        { name: "Magia Przygoda Aida", region: "Europe", id: 13025 },
        { name: "Olivine", region: "Europe", id: 13026 },
        { name: "Omnium Prime", region: "Europe", id: 13027 },
        { name: "Turmus", region: "Europe", id: 13028 },
        { name: "Transport Hub", region: "Europe", id: 13029 },
        { name: "The Lumina", region: "Europe", id: 13030 },
        { name: "Seaforth Dock", region: "Europe", id: 13031 },
        { name: "Silvercoast Lab", region: "Europe", id: 13032 },
        { name: "Karst Cave", region: "Europe", id: 13033 }
    ],
    "Korea": [
        // Korean servers will be added here when identified
    ],
    "South America": [
        { name: "Orion", region: "South America", id: 15001 },
        { name: "Luna Azul", region: "South America", id: 15002 },
        { name: "Tiamat", region: "South America", id: 15003 },
        { name: "Hope", region: "South America", id: 15004 },
        { name: "Tanzanite", region: "South America", id: 15005 },
        { name: "Calodesma Seven", region: "South America", id: 15006 },
        { name: "Antlia", region: "South America", id: 15007 },
        { name: "Pegasus", region: "South America", id: 15008 },
        { name: "Phoenix", region: "South America", id: 15009 },
        { name: "Centaurus", region: "South America", id: 15010 },
        { name: "Cepheu", region: "South America", id: 15011 },
        { name: "Columba", region: "South America", id: 15012 },
        { name: "Corvus", region: "South America", id: 15013 },
        { name: "Cygnus", region: "South America", id: 15014 },
        { name: "Grus", region: "South America", id: 15015 },
        { name: "Hydra", region: "South America", id: 15016 },
        { name: "Lyra", region: "South America", id: 15017 },
        { name: "Ophiuchus", region: "South America", id: 15018 },
        { name: "Pyxis", region: "South America", id: 15019 }
    ],
    "Southeast Asia": [
        { name: "Phantasia", region: "Southeast Asia", id: 16001 },
        { name: "Mechafield", region: "Southeast Asia", id: 16002 },
        { name: "Ethereal Dream", region: "Southeast Asia", id: 16003 },
        { name: "Odyssey", region: "Southeast Asia", id: 16004 },
        { name: "Aestral-Noa", region: "Southeast Asia", id: 16005 },
        { name: "Osillron", region: "Southeast Asia", id: 16006 },
        { name: "Chandra", region: "Southeast Asia", id: 16007 },
        { name: "Saeri", region: "Southeast Asia", id: 16008 },
        { name: "Aeria", region: "Southeast Asia", id: 16009 },
        { name: "Scarlet", region: "Southeast Asia", id: 16010 },
        { name: "Gumi Gumi", region: "Southeast Asia", id: 16011 },
        { name: "Fantasia", region: "Southeast Asia", id: 16012 },
        { name: "Oryza", region: "Southeast Asia", id: 16013 },
        { name: "Stardust", region: "Southeast Asia", id: 16014 },
        { name: "Arcania", region: "Southeast Asia", id: 16015 },
        { name: "Animus", region: "Southeast Asia", id: 16016 },
        { name: "Mistilteinn", region: "Southeast Asia", id: 16017 },
        { name: "Valhalla", region: "Southeast Asia", id: 16018 },
        { name: "Illyrians", region: "Southeast Asia", id: 16019 },
        { name: "Florione", region: "Southeast Asia", id: 16020 },
        { name: "Oneiros", region: "Southeast Asia", id: 16021 },
        { name: "Famtosyana", region: "Southeast Asia", id: 16022 },
        { name: "Edenia", region: "Southeast Asia", id: 16023 }
    ]
}

// Legacy support - keep the old SERVER_REGIONS format for backward compatibility
export const SERVER_REGIONS: Record<string, string[]> = Object.fromEntries(
    Object.entries(SERVERS_DATA).map(([region, servers]) => [
        region,
        servers.map(server => server.name)
    ])
)

export type Region = keyof typeof SERVER_REGIONS

export const ALL_SERVERS: ServerInfo[] = Object.values(SERVERS_DATA).flat()

export function getServerRegion(serverName: string): string {
    if (!serverName) return "Unknown"

    // First try exact match with SERVERS_DATA (case-insensitive)
    const serverLower = serverName.toLowerCase().trim()
    for (const server of ALL_SERVERS) {
        if (server.name.toLowerCase() === serverLower) {
            return server.region
        }
    }

    // Try partial match with SERVERS_DATA
    for (const server of ALL_SERVERS) {
        if (serverLower.includes(server.name.toLowerCase()) ||
            server.name.toLowerCase().includes(serverLower)) {
            return server.region
        }
    }

    // Check for Korean characters (Hangul) - for unknown Korean servers
    const hasKoreanChars = /[\u3130-\u318F\uAC00-\uD7AF]/.test(serverName)
    if (hasKoreanChars) {
        return "Korea"
    }

    return "Unknown"
}

export function getServersByRegion(region: string): string[] {
    return SERVER_REGIONS[region] || []
}

export function getAllRegions(): string[] {
    return Object.keys(SERVER_REGIONS)
}

export function getRegionAbbreviation(region: string): string {
    const abbreviations: Record<string, string> = {
        "North America": "NA",
        "South America": "SA",
        "Europe": "EU",
        "Asia-Pacific": "APAC",
        "Southeast Asia": "SEA",
        "Korea": "KR"
    }
    return abbreviations[region] || region.slice(0, 2).toUpperCase()
}

export function getServerById(serverId: number): ServerInfo | undefined {
    return ALL_SERVERS.find(server => server.id === serverId)
}

export function getServerByName(serverName: string): ServerInfo | undefined {
    return ALL_SERVERS.find(server => server.name === serverName)
}

export function getServersByRegionWithIds(region: string): ServerInfo[] {
    return SERVERS_DATA[region] || []
}