import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PartnerAuthGuard } from './partner-auth.guard';
import { PartnerScopes } from './partner-scopes.decorator';
import { PartnerService } from './partner.service';

class CreateOrderDto {
  @IsString()
  @MinLength(3)
  externalOrderId: string;

  @IsString()
  @MinLength(5)
  ownerDiscordId: string;

  @IsString()
  @MinLength(2)
  botType: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3650)
  durationDays?: number;

  @IsIn(['pool', 'customer'])
  tokenMode: 'pool' | 'customer';

  @ValidateIf((o) => o.tokenMode === 'customer')
  @IsString()
  @MinLength(20)
  customerToken?: string;

  /** Required: bot is locked to this Discord guild only. */
  @IsString()
  @MinLength(17)
  @MaxLength(20)
  @Matches(/^\d{17,20}$/, {
    message: 'guildId must be a Discord snowflake (17–20 digits)',
  })
  guildId: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  prefix?: string;

  @IsOptional()
  @IsNumber()
  price?: number;
}

@Controller('partner/v1')
@UseGuards(PartnerAuthGuard)
export class PartnerController {
  constructor(private readonly partner: PartnerService) {}

  @Get('catalog')
  @PartnerScopes('catalog:read')
  catalog() {
    return this.partner.getCatalog();
  }

  @Get('orders/:externalOrderId')
  @PartnerScopes('orders:read')
  getOrder(
    @Param('externalOrderId') externalOrderId: string,
    @Req() req: any,
  ) {
    return this.partner.getOrderByExternalId(
      req.partner.id,
      externalOrderId,
    );
  }

  @Post('orders')
  @PartnerScopes('orders:write')
  createOrder(@Body() body: CreateOrderDto, @Req() req: any) {
    return this.partner.createOrder(req.partner.id, body);
  }
}
