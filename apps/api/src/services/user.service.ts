import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { BaseService } from '../common/base/base.service';
import { WithAuthErrorHandling } from '../common/decorators/auto-error-handler.decorator';

@Injectable()
export class UserService extends BaseService {
  constructor(private readonly prisma: PrismaClient) {
    super(UserService.name);
  }

  @WithAuthErrorHandling()
  async findUserById(userId: string) {
    this.logger.log(`Finding user by ID: ${userId}`);
    
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      }
    });

    if (!user) {
      this.logger.warn(`User not found with ID: ${userId}`);
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    this.logger.log(`User found: ${user.email}`);
    return user;
  }

  @WithAuthErrorHandling()
  async deleteUserById(userId: string, adminId: string) {
    this.logger.log(`Admin ${adminId} attempting to delete user: ${userId}`);

    // Check if user exists
    const user = await this.findUserById(userId);
    
    // Prevent admin from deleting themselves
    if (userId === adminId) {
      this.logger.warn(`Admin ${adminId} attempted to delete themselves`);
      throw new ForbiddenException('Admin cannot delete their own account');
    }

    // Delete the user
    await this.prisma.user.delete({
      where: { id: userId }
    });

    this.logger.log(`User ${user.email} deleted successfully by admin ${adminId}`);
    
    return {
      message: 'User deleted successfully',
      deletedUser: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };
  }

  @WithAuthErrorHandling()
  async getAllUsers(page: number = 1, limit: number = 10) {
    this.logger.log(`Fetching users page ${page} with limit ${limit}`);
    
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.user.count()
    ]);

    this.logger.log(`Retrieved ${users.length} users out of ${total}`);
    
    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
} 