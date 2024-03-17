// @TODO: use correct implementation
import { PrismaClient } from '@prisma/client';

const GET = async () => {
  const prisma = new PrismaClient();

  await prisma.$connect();

  // this part of code is for devlopment
  const foo = await prisma.pad.findUnique({
    where: {
      id: 1,
    },
  });
  if (!foo) {
    await prisma.pad.create({
      data: {
        id: 1,
        name: 'foo',
      },
    });
  }

  await prisma.$disconnect();

  return Response.json(foo, { status: 200 });
};

// do not cache this route
const revalidate = 0;

export { GET, revalidate };
