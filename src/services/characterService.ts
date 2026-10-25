import type { CharacterInfo } from "../types/tibia";

interface TibiaDataCharacterResponse {
  character?: {
    character?: {
      name?: string;
      sex?: string;
      vocation?: string;
      level?: number;
      achievement_points?: number;
      world?: string;
      residence?: string;
      guild?: {
        name?: string;
      };
      last_login?: string;
      created?: string;
    };
  };
  information?: {
    status?: string;
    message?: string;
  };
}

export const getCharacterInfo = async (characterName: string): Promise<CharacterInfo> => {
  const trimmedName = characterName.trim();
  if (!trimmedName) {
    throw new Error("Informe o nome do personagem.");
  }

  const response = await fetch(
    `https://api.tibiadata.com/v5/character/${encodeURIComponent(trimmedName)}`
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Personagem não encontrado.");
    }
    if (response.status === 502) {
      throw new Error("Serviço de dados do Tibia indisponível no momento. Tente novamente mais tarde.");
    }
    throw new Error("Falha ao buscar personagem.");
  }

  const data = (await response.json()) as TibiaDataCharacterResponse;
  const character = data.character?.character;

  if (!character?.name) {
    throw new Error(data.information?.message ?? "Personagem não encontrado.");
  }

  return {
    name: character.name,
    sex: character.sex,
    vocation: character.vocation,
    level: character.level,
    achievementPoints: character.achievement_points,
    world: character.world,
    residence: character.residence,
    guild: character.guild?.name,
    lastLogin: character.last_login,
    created: character.created,
    outfitUrl: undefined,
    skills: undefined
  };
};
