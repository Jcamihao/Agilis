import { UserResponseDto } from '../../users/dto/user-response.dto';

export class AuthResponseDto {
  accessToken!: string;
  user!: UserResponseDto;

  static fromValues(accessToken: string, user: UserResponseDto): AuthResponseDto {
    return {
      accessToken,
      user,
    };
  }
}
