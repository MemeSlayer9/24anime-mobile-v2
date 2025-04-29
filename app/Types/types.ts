export interface AnimeLink {
  anilistId: number;
  episodeNum: number;
  fileTitle: string;
}


export interface Anime {
  id: string;
  title: {
    english: string,
    native: string,
    romaji: string,
    userPreferred: string
  },
  description: string;
  rating: number;
  image: string;
  coverImage: {
    large: string,
    medium: string,
  },
  status: string,
  season: string;
  startIn?: {
    year: number,
    month: number,
    day: number
  };
  endIn?: {
    year: number,
    month: number,
    day: number
  };
  startDate?: {
    year: number,
    month: number,
    day: number
  };
  endDate?: {
    year: number,
    month: number,
    day: number
  };
  dub: string;
  headSynonyms: string;
  posterImage: string;
  genres: string[];
  episodes: number;
  titleRomaji: string;
  animeLink: AnimeLink[]; 
  relation?: RelationItem[];
  relations?: RelationItem[];
  recommendations?: RecommendationItem[];
  results?: RecommendationItem[];
  characters?: CharacterItem[];
}
interface CharacterItem {
  id: string;
  name?: {
    full: string;
    first?: string;
    last?: string;
  };
  image?: string;
}
interface RecommendationItem {
  id: string;
  title?: {
    romaji: string;
    english?: string;
    native?: string;
    userPreferred?: string;
  };
  coverImage?: {
    large: string;
    medium?: string;
  };
  image?: string;
}

// Create an interface for the relation items
interface RelationItem {
  id: string;
  title?: {
    romaji: string;
    english?: string;
    native?: string;
    userPreferred?: string;
  };
  status?: string;
  coverImage?: {
    large: string;
    medium?: string;
  };
  image?: string;
  format?: string;
  type?: string;
}
export interface Anime2 {
  id: string;
   title: {
english: string,
native: string,
romaji: string,
userPreferred: string
 },
   score: {
    averageScore: number,
  },
   description: string;
  image: string;
coverImage: {
large: string,
medium: string,
genres: string[];
  episodes: number;
  titleRomaji: string;
  animeLink: AnimeLink[]; 
  relation?: RelationItem[];
  relations?: RelationItem[];
  recommendations?: RecommendationItem[];
  results?: RecommendationItem[];
  characters?: CharacterItem[];
},  

posterImage: string;
  genres: string[];
  episodes: number;
  titleRomaji: string;
  animeLink: AnimeLink[]; // Add this to store episode data
  dub: string;

}
export interface Anime3 {
  headSynonyms: string;
  headBackground: string;
  headTitle: string;
detailsCover: {
src: string,
alt: string,
 },  

  episodes: Anime3Episode[];
episodeId: string;
episodeText: string;
 }
export interface Anime3Episode {
  episodeId: string;
  episodeUrl: string;
  episodeText: string;
}
export type RootStackParamList = {
  Details: { id: string }; // Assuming 'id' is a string
  VideoPlayer: { anilistId: number; episodeNum: number };
  Zoro: undefined; // No parameters needed
    Animepahe: undefined; // add this
Animemaster: undefined;
    Animekai: undefined; // add this
  Flix: undefined; // Add this line

};


export type Episode = {
  id: string;
episodeid: string;
  title: string;
  duration: string;
  createdAt: string;
  image: string;
  number: string;
  episode_id: string;
    last_watched?: number; // timestamp when episode was last clicked/watched
   isSubbed?: boolean; // Add these properties directly to BackupEpisode
  isDubbed?: boolean; // Add these properties directly to BackupEpisode
 };

export type BackupEpisode = {
  title: string;
  episodeId: string;
  number: number;
  isFiller: boolean;
  image?: string;
  id: string;
   isSubbed?: boolean; // Add these properties directly to BackupEpisode
  isDubbed?: boolean; // Add these properties directly to BackupEpisode
  anime?: {
    info: {
      poster: string;
    };
  };
  episodes?: {
    id: string;
    number: number;
    title: string;
    isFiller: string;
    isSubbed: boolean;
    isDubbed: boolean;
  }
};


export type BackupResponse = {
  episodes: BackupEpisode[];
}