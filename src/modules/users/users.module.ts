import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersAdminController } from './users.admin.controller';
import { User, UserSchema } from './schemas/user.schema';
import { Address, AddressSchema } from '../address/schemas/address.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Address.name, schema: AddressSchema },
    ]),
  ],
  controllers: [UsersController, UsersAdminController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
