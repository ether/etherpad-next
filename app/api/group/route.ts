import { NextResponse } from "next/server";
import { createGroup, listAllGroups } from '@/service/pads/GroupManager';
import { APIResponse } from '@/types/APIResponse';

export async function POST() {

  const groupId = await createGroup();

  const response = {
    code: 0,
    data: {
      groupId
    },
    message: 'ok'
  } satisfies APIResponse;

  return NextResponse.json(response);
}

export async function GET() {
  const groupId = await listAllGroups();

  const response = {
    code: 0,
    data: {
      groupId
    },
    message: 'ok'
  } satisfies APIResponse;

  return NextResponse.json(response);
}
