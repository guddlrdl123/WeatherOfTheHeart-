// 백엔드 Letter 응답을 화면에서 쓰기 쉽게 정리한 우편함 아이템입니다.
export type MailboxItem = {
  id: string;
  title: string;
  message: string;
  plazaTitle: string;
  plazaId: string;
  generatedImageData: string;
  completedAt: string;
  plazaCreatedAt: string;
  participantCount: number;
  myObjectKey: string;
  myObjectTitle: string;
  read: boolean;
};
