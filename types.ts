export type Notebook = {
    studentName: string;
    id: string;
    title: string;
    description: string;
    createdAt: any;
    student: string;
    content: any;
}

export type Report = {
    nome: string;
    idioma: string;
    preferedDayTime: string;
    cronograma: string;
    report: string;
    createdAt: any;
    addedToStudentName?: string;
  }

  export type Aluno = {
    id: string;
    CNPJ: string;
    name: string;
    professor: string;
    professorId: string;
    mensalidade: number;
    idioma: string;
    payments: any;
    studentMail: string;
    comecouEm: string;
    encerrouEm?: string;
    diaAula: string;
    status: string;
    classes: boolean;
    userName: string;
    profilePictureURL: any;
    diaPagamento: any;
    relatorioDeAula?: Report;
  }

  export interface VocabularyItem {
    vocab: string;
    translation?: string;
    imageURL?: string;
    id?: string;
    hint?: string;
  }


  //Chat types
  export interface User {
    uid: string;
    name: string;
    email: string;
    role: 'student' | 'teacher';
    professorId?: string; // Only for students
    profilePictureURL?: string;
    status?: 'online' | 'offline';
}

export interface Message {
    id: string;
    text: string;
    senderId: string;
    timestamp: number;
    read: false;
    replyTo?: {
      id: string;
      text: string;
      senderId: string;
    };
    translation?: string;
}