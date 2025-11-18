import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RegionsService } from './regions.service';
import { RegionsController } from './regions.controller';
import { RegionsAdminController } from './regions.admin.controller';
import { Region, RegionSchema } from './schemas/region.schema';
import { Country, CountrySchema } from '../country/schemas/country.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Region.name, schema: RegionSchema },
      { name: Country.name, schema: CountrySchema },
    ]),
  ],
  // Register admin controller first to ensure '/regions/admin' is matched before '/regions/:id'
  controllers: [RegionsAdminController, RegionsController],
  providers: [RegionsService],
  exports: [RegionsService],
})
export class RegionsModule {}
