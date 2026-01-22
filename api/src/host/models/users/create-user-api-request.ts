import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class CreateUserApiRequest {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  @MaxLength(25)
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name: string;

  @IsString()
  @MaxLength(25)
  @MinLength(2, { message: 'Surname must be at least 2 characters long' })
  surname: string;
}
