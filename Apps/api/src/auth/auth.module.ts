import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AccountSecurityService } from './account-security.service';
import { MailService } from './mail.service';
import { DashboardModule } from '../dashboard/dashboard.module';
import { ApplyModule } from '../apply/apply.module';

@Module({
  imports: [
    DashboardModule,
    ApplyModule,
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'change-me-apply-dashboard-secret',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    AccountSecurityService,
    MailService,
  ],
  exports: [
    JwtAuthGuard,
    JwtModule,
    AuthService,
    AccountSecurityService,
  ],
})
export class AuthModule {}
