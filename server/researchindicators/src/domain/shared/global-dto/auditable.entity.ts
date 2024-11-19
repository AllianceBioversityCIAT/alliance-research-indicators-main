import { Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export abstract class AuditableEntity {
  @CreateDateColumn({
    type: 'timestamp',
    name: 'created_at',
    nullable: false,
    select: false,
  })
  created_at?: Date;

  @Column({
    type: 'bigint',
    name: 'created_by',
    nullable: true,
    select: false,
  })
  created_by?: number;

  @UpdateDateColumn({
    type: 'timestamp',
    name: 'updated_at',
    nullable: true,
    select: false,
  })
  updated_at?: Date;

  @Column({
    type: 'bigint',
    name: 'updated_by',
    nullable: true,
    select: false,
  })
  updated_by?: number;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
    select: true,
  })
  is_active?: boolean;

  @Column({
    name: 'deleted_at',
    type: 'timestamp',
    nullable: true,
    select: false,
  })
  deleted_at?: Date;
}
