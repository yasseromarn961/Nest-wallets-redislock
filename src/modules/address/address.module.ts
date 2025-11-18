import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';
import { AddressAdminController } from './address.admin.controller';
import { Address, AddressSchema } from './schemas/address.schema';
import { Country, CountrySchema } from '../country/schemas/country.schema';
import { Region, RegionSchema } from '../region/schemas/region.schema';
import { City, CitySchema } from '../city/schemas/city.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Address.name, schema: AddressSchema },
      { name: Country.name, schema: CountrySchema },
      { name: Region.name, schema: RegionSchema },
      { name: City.name, schema: CitySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AddressController, AddressAdminController],
  providers: [AddressService],
  exports: [AddressService],
})
export class AddressModule {}
