import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DatabaseService } from '../../database/database.service';
import { MailService } from '../../providers/mail/mail.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly mailService: MailService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { password, ...otherData } = createUserDto;

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await this.databaseService.user.create({
      data: {
        ...otherData,
        password: hashedPassword,
      },
    });

    // Générer un token unique pour l'email
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Valide 24 heures

    await this.databaseService.verificationToken.create({
      data: {
        userId: user.id,
        token: token,
        type: 'EMAIL_VERIFICATION',
        expiresAt: expiresAt,
      },
    });

    // Envoyer l'email
    this.mailService.sendVerificationEmail(user.email!, token).catch(() => {
      // log it or ignore
    });

    // Ne jamais retourner le mot de passe, même haché, dans la réponse
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findAll(userRole: Role, userOrganismeId: string | null, page = 1, limit = 20) {
    const where: any = {
      role: { in: [Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR] },
    };
    if (userRole !== Role.SUPER_ADMIN) {
      where.organismeId = userOrganismeId;
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.databaseService.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          organismeId: true,
          organisme: { select: { id: true, nom: true } },
          isEmailVerified: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.databaseService.user.count({ where }),
    ]);
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async removeById(id: string) {
    const user = await this.databaseService.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    await this.databaseService.user.delete({ where: { id } });
    return { message: 'Compte supprimé.' };
  }

  async findOne(id: string) {
    const user = await this.databaseService.user.findUnique({
      where: { id },
    });

    if (!user) return null; // Retourner null est intentionnel (auth utilise ce cas)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Cette méthode est utilisée pour l'auth interne (Login) car elle doit récupérer le password
  async findByEmailForAuth(email: string) {
    return this.databaseService.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.databaseService.user.update({
      where: { id },
      data: updateUserDto,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Changer son mot de passe (authentifié) :
   * vérifie l'ancien mot de passe, puis hache et sauvegarde le nouveau.
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.databaseService.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    if (!user.password) throw new BadRequestException('Ce compte utilise une connexion externe (OAuth) et n\'a pas de mot de passe.');

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new UnauthorizedException('Mot de passe actuel incorrect.');

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.databaseService.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    // Invalider toutes les sessions pour forcer une reconnexion sur les autres appareils
    await this.databaseService.session.deleteMany({ where: { userId } });

    return { message: 'Mot de passe modifié avec succès.' };
  }

  /**
   * Suppression RGPD : supprime toutes les données personnelles liées au compte.
   * Exigé par Apple et Google pour accéder aux stores.
   * Prisma gère la cascade sur les sessions, tokens OAuth, observations, badges, etc.
   * (via onDelete: Cascade défini dans le schema Prisma)
   */
  async remove(id: string) {
    const user = await this.databaseService.user.findUnique({ where: { id } });
    if (!user) {
      return { message: 'Compte déjà supprimé' };
    }

    await this.databaseService.user.delete({ where: { id } });
    return { message: 'Votre compte et toutes vos données ont été supprimés définitivement.' };
  }
}
