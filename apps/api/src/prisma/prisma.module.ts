import {Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

@Global() // this indicate the prisma could be use globally
@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})

export class PrismaModule {}