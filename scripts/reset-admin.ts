import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function reset() {
  const email = "admin.herozerowaste@gmail.com";
  const password = "admin";
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const existing = await prisma.user.findUnique({ where: { email } });
  
  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });
    console.log("Admin password reset to 'admin'");
  } else {
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nama: "Admin O2W",
        role: "superadmin"
      }
    });
    console.log("Admin created with password 'admin'");
  }
}

reset().catch(console.error);
