export class User {
  public userId: number | null;
  public name: string;

  constructor(name: string, userId: number) {
    this.name = name;
    this.userId = userId;
  }
}
