export class RoleCompareDto<Enum, Entity> {
  public enum?: Enum;
  public compareKey: keyof Entity;
}
