import type { FC } from 'react';

type PageProps = {
  params: {
    pad: string;
  };
};

const Page: FC<PageProps> = ({ params }) => (
  <div>
    <h1>{params.pad}</h1>
  </div>
);

export default Page;
