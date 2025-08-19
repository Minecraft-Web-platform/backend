export type JwtPayload = {
  username_lower: string;
  id: number;
  uuid: string; //uuid generated using username
};
