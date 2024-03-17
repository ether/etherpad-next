import prisma from "@/lib/prisma";

const GET = async () => {

  await prisma.$connect();

  // this part of code is for devlopment
  const foo = await prisma.pad.findUnique({
    where: {
      id: 1,
    },
  });
  if(!foo) {
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

export { GET };
