import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CountriesService } from './countries.service';
import { CountriesController } from './countries.controller';
import { CountriesAdminController } from './countries.admin.controller';
import { Country, CountrySchema } from './schemas/country.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Country.name, schema: CountrySchema }]),
  ],
  // Register admin controller first to ensure '/countries/admin' is matched before '/countries/:id'
  controllers: [CountriesAdminController, CountriesController],
  providers: [CountriesService],
  exports: [CountriesService],
})
export class CountriesModule {}
