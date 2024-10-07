import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { SessionFormat } from '../../session-formats/entities/session-format.entity';
import { SessionType } from '../../session-types/entities/session-type.entity';
import { Degree } from '../../degrees/entities/degree.entity';
import { SessionLength } from '../../session-lengths/entities/session-length.entity';
import { Gender } from '../../genders/entities/gender.entity';
import { SessionPurpose } from '../../session-purposes/entities/session-purpose.entity';
import { DeliveryModality } from '../../delivery-modalities/entities/delivery-modality.entity';

@Entity('result_capacity_sharing')
export class ResultCapacitySharing extends AuditableEntity {
  @Column('bigint', {
    name: 'result_id',
    primary: true,
    nullable: false,
  })
  result_id!: number;

  @Column('text', {
    name: 'supervisor_name',
    nullable: true,
  })
  supervisor_name?: string;

  @Column('text', {
    name: 'supervisor_email',
    nullable: true,
  })
  supervisor_email?: string;

  @Column('text', {
    name: 'training_title',
    nullable: true,
  })
  training_title?: string;

  @Column('text', {
    name: 'trainee_name',
    nullable: true,
  })
  trainee_name?: string;

  @Column('bigint', {
    name: 'session_format_id',
    nullable: true,
  })
  session_format_id?: number;

  @Column('bigint', {
    name: 'session_type_id',
    nullable: true,
  })
  session_type_id?: number;

  @Column('bigint', {
    name: 'degree_id',
    nullable: true,
  })
  degree_id?: number;

  @Column('bigint', {
    name: 'gender_id',
    nullable: true,
  })
  gender_id?: number;

  @Column('bigint', {
    name: 'session_length_id',
    nullable: true,
  })
  session_length_id?: number;

  @Column('bigint', {
    name: 'session_purpose_id',
    nullable: true,
  })
  session_purpose_id?: number;

  @Column('text', {
    name: 'session_purpose_description',
    nullable: true,
  })
  session_purpose_description?: string;

  @Column('bigint', {
    name: 'session_participants_male',
    nullable: true,
  })
  session_participants_male?: number;

  @Column('bigint', {
    name: 'session_participants_female',
    nullable: true,
  })
  session_participants_female?: number;

  @Column('bigint', {
    name: 'session_participants_non_binary',
    nullable: true,
  })
  session_participants_non_binary?: number;

  @Column('bigint', {
    name: 'session_participants_total',
    nullable: true,
  })
  session_participants_total?: number;

  @Column('text', {
    name: 'session_description',
    nullable: true,
  })
  session_description?: string;

  @Column('boolean', {
    name: 'is_attending_organization',
    nullable: true,
  })
  is_attending_organization?: boolean;

  @Column('timestamp', {
    name: 'start_date',
    nullable: true,
  })
  start_date?: Date;

  @Column('timestamp', {
    name: 'end_date',
    nullable: true,
  })
  end_date?: Date;

  @Column('bigint', {
    name: 'delivery_modality_id',
    nullable: true,
  })
  delivery_modality_id?: number;

  @Column('bigint', {
    name: 'language_id',
    nullable: true,
  })
  language_id?: number;

  @ManyToOne(
    () => SessionFormat,
    (sessionFormat) => sessionFormat.result_capacity_sharings,
  )
  @JoinColumn({ name: 'session_format_id' })
  session_format!: SessionFormat;

  @ManyToOne(
    () => SessionType,
    (sessionType) => sessionType.result_capacity_sharings,
  )
  @JoinColumn({ name: 'session_type_id' })
  session_type!: SessionType;

  @ManyToOne(() => Degree, (degree) => degree.result_capacity_sharings)
  @JoinColumn({ name: 'degree_id' })
  degree!: Degree;

  @ManyToOne(() => Gender, (gender) => gender.result_capacity_sharings)
  @JoinColumn({ name: 'gender_id' })
  gender: Gender;

  @ManyToOne(
    () => SessionLength,
    (sessionLength) => sessionLength.result_capacity_sharings,
  )
  @JoinColumn({ name: 'session_length_id' })
  session_length!: SessionLength;

  @ManyToOne(
    () => SessionPurpose,
    (sessionPurpose) => sessionPurpose.result_capacity_sharings,
  )
  @JoinColumn({ name: 'session_purpose_id' })
  session_purpose!: SessionPurpose;

  @ManyToOne(
    () => DeliveryModality,
    (deliveryModality) => deliveryModality.result_capacity_sharings,
  )
  @JoinColumn({ name: 'delivery_modality_id' })
  delivery_modality!: DeliveryModality;
}
