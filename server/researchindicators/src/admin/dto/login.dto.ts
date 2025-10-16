import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: '1f8e5686-df74-44ff-8fc2-ae981ff2c3c7',
    description: 'Client ID',
  })
  @IsString()
  @IsNotEmpty()
  client_id: string;

  @ApiProperty({
    example: 'BvqnQl3b79ewIG1J',
    description: 'Client Secret',
  })
  @IsString()
  @IsNotEmpty()
  client_secret: string;
}

export class ValidateTokenResponseDto {
  @ApiProperty({
    example: true,
    description: 'Indicates if the token is valid',
  })
  isValid: boolean;
}
