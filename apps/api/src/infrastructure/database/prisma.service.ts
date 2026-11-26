import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(configService: ConfigService) {
    const configuredConnectionString =
      configService.getOrThrow<string>('DATABASE_URL');
    const connectionUrl = new URL(configuredConnectionString);

    if (configService.get<boolean>('DATABASE_USE_LIBPQ_SSL_COMPAT')) {
      connectionUrl.searchParams.set('uselibpqcompat', 'true');
    }

    const adapter = new PrismaPg({
      connectionString: connectionUrl.toString(),
    });

    super({
      adapter,
      transactionOptions: {
        // Hosted poolers can take longer than Prisma's two-second default to
        // lease a cold connection. Keep the limit explicit and configurable.
        maxWait: configService.getOrThrow<number>(
          'DATABASE_TRANSACTION_MAX_WAIT_MS',
        ),
        timeout: configService.getOrThrow<number>(
          'DATABASE_TRANSACTION_TIMEOUT_MS',
        ),
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
