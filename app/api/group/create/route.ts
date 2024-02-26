import {createGroup} from '@/service/pads/GroupManager';
import { APIResponse } from '@/types/APIResponse';
import { NextResponse } from "next/server";

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

