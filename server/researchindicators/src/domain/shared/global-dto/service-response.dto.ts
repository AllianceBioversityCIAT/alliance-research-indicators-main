import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class ServiceResponseDto<T> {
  @ApiProperty()
  status: HttpStatus;

  @ApiProperty({
    description:
      'The data field can contain different types of data depending on the context.',
  })
  data?: T;

  @ApiProperty()
  description: string;

  @ApiProperty()
  errors?: any;
}
