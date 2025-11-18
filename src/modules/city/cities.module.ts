import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CitiesService } from './cities.service';
import { CitiesController } from './cities.controller';
import { CitiesAdminController } from './cities.admin.controller';
import { City, CitySchema } from './schemas/city.schema';
import { Country, CountrySchema } from '../country/schemas/country.schema';
import { Region, RegionSchema } from '../region/schemas/region.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: City.name, schema: CitySchema },
      { name: Country.name, schema: CountrySchema },
      { name: Region.name, schema: RegionSchema },
    ]),
  ],
  // Register admin controller first to ensure '/cities/admin' is matched before '/cities/:id'
  controllers: [CitiesAdminController, CitiesController],
  providers: [CitiesService],
  exports: [CitiesService],
})
export class CitiesModule {}
